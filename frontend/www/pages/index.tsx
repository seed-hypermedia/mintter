import React from "react";
import Link from "../components/link";
import Seo from "../components/seo";
import Container from "../components/container";

export default function Home() {
  return (
    <Layout>
      <Seo title="Mintter" />
      <Container>
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Mintter</h1>
          <Link href="/app/library">
            <a className="py-4 px-5 bg-blue-600 text-white rounded">Open App</a>
          </Link>
        </div>
      </Container>
    </Layout>
  );
}

function Layout({ children, ...props }) {
  return (
    <div className="" {...props}>
      {children}
    </div>
  );
}
