import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default async function DownloadIDCard(idCardRef, studentData) {

    if (!idCardRef?.current) return;

    // Allow React to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(idCardRef.current, {
    scale: 6,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,

    scrollX: 0,
    scrollY: -window.scrollY,

    width: idCardRef.current.scrollWidth,
    height: idCardRef.current.scrollHeight,

    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
});

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
    orientation:
        canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
});

pdf.addImage(
    imgData,
    "PNG",
    0,
    0,
    canvas.width,
    canvas.height,
    undefined,
    "FAST"
);

    pdf.save(`${studentData.studentId}_ID_Card.pdf`);
}