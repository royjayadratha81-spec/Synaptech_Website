import { useEffect } from "react";
import catalogueHtml from "../assets/catalogues/programme-fee-comparison.html?raw";

const catalogueStyles = catalogueHtml.match(/<style>([\s\S]*?)<\/style>/i)?.[1] || "";
const catalogueBody = catalogueHtml.match(/<body>([\s\S]*?)<\/body>/i)?.[1] || "";

export default function ProgrammeFeeCatalogue() {
  useEffect(() => {
    document.title = "Synaptech Education | Programme & Fee Comparison";
    const sectionId = window.location.hash.replace("#", "");
    if (sectionId) {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
      });
    }
  }, []);

  return (
    <>
      <style>{catalogueStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: catalogueBody }} />
    </>
  );
}
