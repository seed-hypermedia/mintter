import React from "react";
import Textarea from "../../../components/textarea";

export default function DocumentTitle({ value, onChange }) {
  return <Textarea value={value} onChange={onChange} />;
}
