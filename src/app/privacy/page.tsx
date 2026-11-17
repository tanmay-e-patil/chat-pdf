import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy | ChatPDF" };

const sections = [
  {
    title: "What we store",
    items: [
      "Your PDF, in a private AWS S3 bucket. It is never public; the viewer uses links that expire after 5 minutes.",
      "Text extracted from your PDF, split into passages with page numbers, in a Pinecone vector index kept separate for each document.",
      "Your questions and the assistant's answers, including their page citations, in our Postgres database (Neon).",
    ],
  },
  {
    title: "Who processes it",
    items: [
      "Amazon Bedrock creates the search embeddings and generates answers.",
      "Clerk handles sign-in. Pinecone handles search. Neon hosts the database.",
    ],
  },
  {
    title: "Analytics",
    items: [
      "We use self-hosted page analytics (Rybbit) for page views and errors. Session replay is off, so your documents and chats are not recorded.",
    ],
  },
  {
    title: "Deleting your data",
    items: [
      "Deleting a chat removes the PDF from S3, its passages from Pinecone, and its messages from our database.",
      "Clearing a chat's messages deletes the conversation and keeps the document.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#070A12] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Back
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-4 text-slate-300">
          What happens to your PDFs and conversations when you use ChatPDF.
        </p>
        {sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
