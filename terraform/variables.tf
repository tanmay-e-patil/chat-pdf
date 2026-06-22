variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name_prefix" {
  type    = string
  default = "chat-pdf"
}

variable "s3_bucket_name" {
  type = string
}

variable "s3_bucket_region" {
  type    = string
  default = "us-west-2"
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "pinecone_environment" {
  type = string
}

variable "pinecone_api_key" {
  type      = string
  sensitive = true
}

variable "pinecone_index_name" {
  type    = string
  default = "chat-pdf-aws"
}

variable "bedrock_embedding_model_id" {
  type    = string
  default = "amazon.titan-embed-text-v2:0"
}

variable "bedrock_chat_model_id" {
  type    = string
  default = "us.amazon.nova-micro-v1:0"
}

variable "lambda_timeout_seconds" {
  type    = number
  default = 300
}

variable "lambda_memory_mb" {
  type    = number
  default = 1024
}

variable "app_iam_user_name" {
  type    = string
  default = null
}
