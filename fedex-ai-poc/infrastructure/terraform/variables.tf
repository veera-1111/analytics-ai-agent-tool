variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region"
}

variable "aws_profile" {
  type        = string
  default     = "anuruhu-dev"
  description = "AWS CLI profile name"
}

variable "credentials_encryption_key" {
  type        = string
  sensitive   = true
  description = "32-byte hex key for AES-256 encryption of stored DB credentials — pass via TF_VAR_credentials_encryption_key"
}

variable "amplify_github_token" {
  type        = string
  sensitive   = true
  description = "GitHub personal access token for Amplify — pass via TF_VAR_amplify_github_token"
}

variable "github_repo_name" {
  type        = string
  default     = "analytics-ai-agent-tool"
  description = "GitHub repository name (without owner prefix)"
}
