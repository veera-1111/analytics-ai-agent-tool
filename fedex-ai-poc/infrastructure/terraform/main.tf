terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id  = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name
  name_prefix = "quantixai"
}

# ── ECR Repository ─────────────────────────────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name_prefix}-backend" }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# ── DynamoDB — Sessions ────────────────────────────────────────────────────
resource "aws_dynamodb_table" "sessions" {
  name         = "QuantixAI-Sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "timestamp"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { Name = "QuantixAI-Sessions" }
}

# ── DynamoDB — Schema Cache ────────────────────────────────────────────────
resource "aws_dynamodb_table" "schema_cache" {
  name         = "QuantixAI-SchemaCache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { Name = "QuantixAI-SchemaCache" }
}

# ── DynamoDB — Connections ─────────────────────────────────────────────────
resource "aws_dynamodb_table" "connections" {
  name         = "QuantixAI-Connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }

  tags = { Name = "QuantixAI-Connections" }
}

# ── DynamoDB — Saved Reports ───────────────────────────────────────────────
resource "aws_dynamodb_table" "reports" {
  name         = "QuantixAI-Reports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "report_id"

  attribute {
    name = "report_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { Name = "QuantixAI-Reports" }
}

# ── DynamoDB — Conversation Logs ──────────────────────────────────────────
resource "aws_dynamodb_table" "conversation_logs" {
  name         = "QuantixAI-ConversationLogs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "created_at"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { Name = "QuantixAI-ConversationLogs" }
}

# ── S3 — Exports Bucket ────────────────────────────────────────────────────
resource "aws_s3_bucket" "exports" {
  bucket        = "${local.name_prefix}-exports-${local.account_id}"
  force_destroy = true
  tags          = { Name = "${local.name_prefix}-exports" }
}

resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule {
    id     = "expire-exports"
    status = "Enabled"
    filter { prefix = "exports/" }
    expiration { days = 7 }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Terraform State S3 Bucket ──────────────────────────────────────────────
resource "aws_s3_bucket" "tfstate" {
  bucket        = "${local.name_prefix}-tfstate-${local.account_id}"
  force_destroy = false
  tags          = { Name = "${local.name_prefix}-tfstate" }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── DynamoDB — Terraform State Lock ───────────────────────────────────────
resource "aws_dynamodb_table" "tfstate_lock" {
  name         = "${local.name_prefix}-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { Name = "${local.name_prefix}-tfstate-lock" }
}

# ── IAM Role for Lambda ────────────────────────────────────────────────────
resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_custom" {
  name = "${local.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockAccess"
        Effect = "Allow"
        Action = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "arn:aws:bedrock:${local.region}::foundation-model/*"
      },
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem",
                  "dynamodb:Query", "dynamodb:UpdateItem", "dynamodb:BatchWriteItem",
                  "dynamodb:Scan"]
        Resource = [
          aws_dynamodb_table.sessions.arn,
          aws_dynamodb_table.schema_cache.arn,
          aws_dynamodb_table.connections.arn,
          aws_dynamodb_table.reports.arn,
          aws_dynamodb_table.conversation_logs.arn
        ]
      },
      {
        Sid    = "S3ExportsAccess"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.exports.arn}/exports/*"
      }
    ]
  })
}
