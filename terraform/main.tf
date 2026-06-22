terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "archive_file" "ingestion_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/ingestion-lambda"
  output_path = "${path.module}/.terraform/ingestion-lambda.zip"
}

resource "aws_iam_role" "ingestion_lambda" {
  name = "${var.name_prefix}-ingestion-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ingestion_lambda" {
  name = "${var.name_prefix}-ingestion-lambda"
  role = aws_iam_role.ingestion_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.name_prefix}-ingestion:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_embedding_model_id}"
      }
    ]
  })
}

resource "aws_iam_policy" "app_runtime" {
  name = "${var.name_prefix}-app-runtime"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = aws_lambda_function.ingestion.arn
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        # Nova inference profiles use different ARNs by region; keep this policy attachable and simple.
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "app_runtime" {
  count      = var.app_iam_user_name == null ? 0 : 1
  user       = var.app_iam_user_name
  policy_arn = aws_iam_policy.app_runtime.arn
}

resource "aws_lambda_function" "ingestion" {
  function_name    = "${var.name_prefix}-ingestion"
  role             = aws_iam_role.ingestion_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.ingestion_lambda.output_path
  source_code_hash = data.archive_file.ingestion_lambda.output_base64sha256
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb

  environment {
    variables = {
      DATABASE_URL               = var.database_url
      NEXT_PUBLIC_S3_BUCKET_NAME = var.s3_bucket_name
      S3_BUCKET_REGION           = var.s3_bucket_region
      PINECONE_ENVIRONMENT       = var.pinecone_environment
      PINECONE_API_KEY           = var.pinecone_api_key
      PINECONE_INDEX_NAME        = var.pinecone_index_name
      BEDROCK_EMBEDDING_MODEL_ID = var.bedrock_embedding_model_id
      BEDROCK_CHAT_MODEL_ID      = var.bedrock_chat_model_id
    }
  }
}
