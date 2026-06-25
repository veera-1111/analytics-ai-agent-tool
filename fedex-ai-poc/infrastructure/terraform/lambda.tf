# ── Lambda Function ────────────────────────────────────────────────────────
resource "aws_lambda_function" "backend" {
  function_name = "${local.name_prefix}-backend"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_SESSIONS_TABLE          = aws_dynamodb_table.sessions.name
      DYNAMODB_SCHEMA_CACHE_TABLE      = aws_dynamodb_table.schema_cache.name
      DYNAMODB_CONNECTIONS_TABLE       = aws_dynamodb_table.connections.name
      DYNAMODB_REPORTS_TABLE           = aws_dynamodb_table.reports.name
      DYNAMODB_CONVERSATION_LOGS_TABLE = aws_dynamodb_table.conversation_logs.name
      S3_EXPORTS_BUCKET                = aws_s3_bucket.exports.bucket
      CREDENTIALS_ENCRYPTION_KEY       = var.credentials_encryption_key
      AWS_REGION_NAME                  = var.aws_region
      BEDROCK_MODEL_ID                 = "anthropic.claude-3-5-sonnet-20241022-v2:0"
      LOG_LEVEL                        = "info"
    }
  }

  tags = { Name = "${local.name_prefix}-backend" }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy.lambda_custom,
  ]
}

# ── API Gateway HTTP API ───────────────────────────────────────────────────
resource "aws_apigatewayv2_api" "backend" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Session-ID"]
    max_age       = 300
  }

  tags = { Name = "${local.name_prefix}-api" }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.backend.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format          = "$context.requestId $context.status $context.error.message"
  }
}

resource "aws_apigatewayv2_integration" "backend" {
  api_id                 = aws_apigatewayv2_api.backend.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.backend.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.backend.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.backend.execution_arn}/*/*"
}

# ── CloudWatch Log Groups ──────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name_prefix}-backend"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-lambda-logs" }
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/${local.name_prefix}-api"
  retention_in_days = 14
  tags              = { Name = "${local.name_prefix}-apigw-logs" }
}
