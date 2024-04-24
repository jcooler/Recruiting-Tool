import Head from "next/head";
import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import { Candidate as CandidateModel } from "../models/candidate";
import CandidateTable from "@/components/candidateTable";
import NavBar from "@/components/NavBar";
import NewEditCandidate from "@/components/newEditCandidate";
import * as CandidatesApi from "@/network/candidate-api";
import { Button, Spinner } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [candidates, setCandidates] = useState<CandidateModel[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [showCandidateLoadingError, setShowCandidateLoadingError] =
    useState(false);

  const [show, setShow] = useState(false);

  const [candidateToEdit, setCandidateToEdit] = useState<CandidateModel | null>(
    null
  );

  useEffect(() => {
    async function fetchCandidates() {
      const candidates = await CandidatesApi.fetchCandidates();
      try {
        setShowCandidateLoadingError(false);
        setCandidatesLoading(true);
        const response = await fetch("http://localhost:5001/api/candidates/", {
          method: "GET",
        });
        const candidates = await response.json();
        setCandidates(candidates);
      } catch (error) {
        console.error(error);
        setShowCandidateLoadingError(true);
      } finally {
        setCandidatesLoading(false);
      }
    }
    fetchCandidates();
  }, []);

  async function deleteCandidate(candidate: CandidateModel) {
    try {
      await CandidatesApi.deleteCandidate(candidate._id);
      setCandidates(
        candidates.filter(
          (existingCandidate) => existingCandidate._id !== candidate._id
        )
      );
    } catch (error) {
      console.error(error);
      alert(error);
    }
  }

  const candidateTable = (
    <CandidateTable
      candidates={candidates}
      onDeleteCandidate={deleteCandidate}
      onCandidateClicked={setCandidateToEdit}
    />
  );

  return (
    <>
      <Head>
        <title>Applicant Wizard</title>
        <meta
          name="description"
          content="Applicant Wizard is the leading Applicant Tracking System built with Next.js"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <NavBar
      loggedInUser={null}
      onSignUpClicked={() => {}}
      onLoginClicked={() => {}}
      onLogoutSuccessful={() => {}}
      
      />
      <Button onClick={() => setShow(true)}>
        <FaPlus />
        Add
      </Button>
      {show && (
        <NewEditCandidate
          onDismiss={() => setShow(false)}
          onCandidateAdded={(newCandidate) => {
            setCandidates([...candidates, newCandidate]);
            setShow(false);
          }}
        />
      )}
      {candidateToEdit && (
        <NewEditCandidate
          candidateToEdit={candidateToEdit}
          onDismiss={() => setCandidateToEdit(null)}
          onCandidateAdded={(updatedCandidate) => {
            setCandidates(
              candidates.map((existingCandidate) =>
                existingCandidate._id === updatedCandidate._id
                  ? updatedCandidate
                  : existingCandidate
              )
            );
            setCandidateToEdit(null);
          }}
        />
      )}

      {candidatesLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}>
          <Spinner
            animation="border"
            variant="primary"
          />
        </div>
      )}
      {showCandidateLoadingError && (
        <p>Failed to load candidates, try refreshing.</p>
      )}
      {!candidatesLoading && !showCandidateLoadingError && (
        <>
          {candidates.length > 0 ? (
            candidateTable
          ) : (
            <p>No candidates found. Add one to get started.</p>
          )}
        </>
      )}
    </>
  );
}
