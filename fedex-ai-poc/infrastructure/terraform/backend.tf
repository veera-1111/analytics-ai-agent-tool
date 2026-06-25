# NOTE: Bootstrap the S3 bucket + DynamoDB lock table first via main.tf,
# then uncomment this block and run `terraform init -migrate-state`
# to migrate local state to S3 remote backend.

# terraform {
#   backend "s3" {
#     bucket         = "quantixai-tfstate-<your-account-id>"
#     key            = "quantixai/terraform.tfstate"
#     region         = "us-east-1"
#     profile        = "anuruhu-dev"
#     dynamodb_table = "quantixai-tfstate-lock"
#     encrypt        = true
#   }
# }
