## Project Overview

This project is a web application that allows users to interact with PDF documents using chat-based features. It leverages modern web technologies and integrates with several third-party services for authentication, storage, and AI-powered functionalities.

## Features

- User authentication and authorization
- Upload and manage PDF documents
- Chat interface for querying PDF content
- Integration with OpenAI for AI-powered responses
- Secure file storage using S3-compatible services
- Payment processing with Stripe

## Technologies Used

- Next.js
- Clerk (Authentication)
- AWS S3
- Pinecone (Vector database)
- OpenAI API
- Stripe (Payments)
- NeonDB 

## Setup Instructions

1. Clone the repository.
2. Install dependencies using your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`).
3. Configure the required environment variables as shown above.
4. Run the development server.
5. Open [http://localhost:3000](http://localhost:3000) in your browser.


## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

```plaintext
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

DATABASE_URL=
NEXT_PUBLIC_S3_ACCESS_KEY_ID=
NEXT_PUBLIC_S3_SECRET_ACCESS_KEY=
NEXT_PUBLIC_S3_BUCKET_NAME=
AWS_REGION=
PINECONE_API_KEY=
OPENAI_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_BASE_URL=http://localhost:3000
