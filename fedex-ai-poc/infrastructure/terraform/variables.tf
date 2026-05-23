variable "aws_region" {
  type        = string
  default     = "ap-south-1"
  description = "The target AWS region for EC2 deployment"
}

variable "aws_profile" {
  type        = string
  default     = "anuruhu-dev"
  description = "The AWS CLI profile name"
}

variable "instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance size"
}

variable "key_name" {
  type        = string
  default     = "analytics-ai-key"
  description = "EC2 Key Pair name"
}
