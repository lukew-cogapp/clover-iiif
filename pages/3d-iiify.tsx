import React, { useEffect } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

const ThreeDAfy = dynamic(
  () => import("docs/components/ThreeDAfy/ThreeDAfy"),
  { ssr: false },
);

const Page: React.FC = () => {
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    const prevBodyMargin = document.body.style.margin;
    document.documentElement.style.background = "#ebebe1";
    document.body.style.background = "#ebebe1";
    document.body.style.margin = "0";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
      document.body.style.margin = prevBodyMargin;
    };
  }, []);
  return (
    <>
      <Head>
        <title>3D-iiify — Clover IIIF</title>
        <meta
          name="description"
          content="Map a IIIF image onto a 3D model, or texture a 3D model with a 2D IIIF image."
        />
      </Head>
      <ThreeDAfy />
    </>
  );
};

export default Page;
