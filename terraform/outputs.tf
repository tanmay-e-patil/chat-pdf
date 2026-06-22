output "ingestion_lambda_name" {
  value = aws_lambda_function.ingestion.function_name
}

output "ingestion_lambda_arn" {
  value = aws_lambda_function.ingestion.arn
}

output "app_runtime_policy_arn" {
  value = aws_iam_policy.app_runtime.arn
}
