# AWS ingestion resources

Build the Lambda bundle first:

```bash
pnpm build:ingestion-lambda
```

Create `terraform.tfvars`:

```hcl
aws_region        = "us-east-1" # Lambda + Bedrock
s3_bucket_name    = "your-bucket"
s3_bucket_region  = "us-west-2"
database_url      = "postgres://..."
pinecone_environment = "..."
pinecone_api_key     = "..."
pinecone_index_name  = "chat-pdf-aws"

# Optional: attach Lambda invoke + Bedrock permissions to an existing Vercel IAM user.
app_iam_user_name = "vercel-chat-pdf"
```

Apply:

```bash
cd terraform
terraform init
terraform apply
```

If you do not set `app_iam_user_name`, manually attach the `app_runtime_policy_arn`
to the IAM principal used by Vercel.

Set the app env var to the output:

```bash
AWS_INGESTION_LAMBDA_NAME=chat-pdf-ingestion
```

Skipped S3 bucket creation; this app already uses an existing upload bucket.
