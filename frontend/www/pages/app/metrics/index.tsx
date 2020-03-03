import { Fragment } from "react";
import Link from "../../../components/link";
import Container from "../../../components/container";
import Seo from "../../../components/seo";
import Sidebar from "../sidebar";

export default function Library() {
  return (
    <Fragment>
      <Seo title="Editor | Mintter" />
      <div className="h-screen flex bg-gray-100">
        <Sidebar />
        <div className="flex-1 overflow-y-auto px-8 py-10 lg:px-10 lg:py-12">
          <Container>
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-5">Metrics</h1>
            </div>
            <p>WIP.</p>
          </Container>
        </div>
      </div>
    </Fragment>
  );
}
