import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import { Candidate as CandidateModel } from "./models/candidate";
import CandidateTable from "@/components/candidateTable";
import Nav from "@/components/Nav";
import NewCandidate from "@/components/newCandidate";
import * as CandidatesApi from "@/network/candidate-api";
import { Button } from "react-bootstrap";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {

const [candidates, setCandidates] = useState<CandidateModel[]>([]);

const [show, setShow] = useState(false);

useEffect(() => {
async function fetchCandidates() {
const candidates = await CandidatesApi.fetchCandidates();
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
      <Nav />
      <Button onClick={setShow} >
        Add Candidate
      </Button>
    {
      show && <NewCandidate
      onDismiss={() => setShow(false)}
      onCandidateAdded={(newCandidate) => {
        setCandidates([...candidates, newCandidate]);
        setShow(false);
      }}
      />
    }
      <CandidateTable candidates={candidates} />
      
    </>
  ); 
}