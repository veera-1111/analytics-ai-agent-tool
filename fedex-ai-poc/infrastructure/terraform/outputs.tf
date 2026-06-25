output "api_gateway_url" {
  value       = aws_apigatewayv2_api.backend.api_endpoint
  description = "API Gateway HTTP API endpoint URL"
}

output "amplify_app_url" {
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}"
  description = "Amplify frontend URL"
}

output "ecr_repository_uri" {
  value       = aws_ecr_repository.backend.repository_url
  description = "ECR repository URI for Lambda container image"
}

output "dynamodb_sessions_table" {
  value       = aws_dynamodb_table.sessions.name
  description = "DynamoDB sessions table name"
}

output "dynamodb_schema_cache_table" {
  value       = aws_dynamodb_table.schema_cache.name
  description = "DynamoDB schema cache table name"
}

output "dynamodb_connections_table" {
  value       = aws_dynamodb_table.connections.name
  description = "DynamoDB connections table name"
}

output "dynamodb_reports_table" {
  value       = aws_dynamodb_table.reports.name
  description = "DynamoDB reports table name"
}

output "dynamodb_conversation_logs_table" {
  value       = aws_dynamodb_table.conversation_logs.name
  description = "DynamoDB conversation logs table name"
}

output "s3_exports_bucket" {
  value       = aws_s3_bucket.exports.bucket
  description = "S3 bucket name for report exports"
}

output "amplify_app_id" {
  value       = aws_amplify_app.frontend.id
  description = "Amplify app ID (needed for CI/CD)"
}

output "lambda_function_name" {
  value       = aws_lambda_function.backend.function_name
  description = "Lambda function name (needed for CI/CD deployments)"
}
