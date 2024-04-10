import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";



const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <>
      <Head>
        <title>Applicant Wizard</title>
        <meta name="description" content="Applicant Wizard is the leading Applicant Tracking System built with Next.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <p>Hello World</p>
    </>
  );
}
