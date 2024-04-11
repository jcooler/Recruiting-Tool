import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import { Candidate as CandidateModel } from "./models/candidate";
import { Container } from "react-bootstrap";
import CandidateTable from "@/components/candidateTable";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {

const [candidates, setCandidates] = useState<CandidateModel[]>([]);

useEffect(() => {
  const fetchCandidates = async () => {

    try {
      const response = await fetch("http://localhost:5001/api/candidates/", {method: "GET"});
      const candidates = await response.json();
      setCandidates(candidates);
    } catch (error) {
      console.error(error);
      alert(error);
    }

  }
  fetchCandidates();
}, []);


  return (
    <>
      <Head>
        <title>Applicant Wizard</title>
        <meta name="description" content="Applicant Wizard is the leading Applicant Tracking System built with Next.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container>
      <CandidateTable candidates={candidates} />
      </Container>
    </>
  ); 
}