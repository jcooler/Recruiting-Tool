import { Button, Spinner } from "react-bootstrap";
import NewEditCandidate from "./newEditCandidate";
import { useState } from "react";
import { Candidate as CandidateModel } from "@/models/candidate";
import CandidateTable from "./candidateTable";
import * as CandidatesApi from "@/network/candidate-api";
import { useEffect } from "react";

export default function CandidateLoggedInView() {
  const [candidates, setCandidates] = useState<CandidateModel[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [showCandidateLoadingError, setShowCandidateLoadingError] =
    useState(false);

  const [show, setShow] = useState(false);

  const [candidateToEdit, setCandidateToEdit] = useState<CandidateModel | null>(
    null
  );

  useEffect(() => {
    async function loadCandidates() {
      try {
        setShowCandidateLoadingError(false);
        setCandidatesLoading(true);
        const candidates = await CandidatesApi.fetchCandidates();
        setCandidates(candidates);
      } catch (error) {
        console.error(error);
        setShowCandidateLoadingError(true);
      } finally {
        setCandidatesLoading(false);
      }
    }
    loadCandidates();
  }, []);

  async function deleteCandidate(candidate: CandidateModel) {
    try {
      await CandidatesApi.deleteCandidate(candidate._id);
      setCandidates(candidates.filter(existingCandidate => existingCandidate._id !== candidate._id));
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
      <Button style={{justifyContent:"center", alignItems:"center", margin:"1rem"}} onClick={() => setShow(true)}>
        Add Candidate
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
        <p style={{textAlign:"center", marginTop:"5rem"}}>Failed to load candidates, try refreshing.</p>
      )}
      {!candidatesLoading && !showCandidateLoadingError && (
        <>
          {candidates.length > 0 ? (
            candidateTable
          ) : (
            <p style={{textAlign:"center", marginTop:"5rem"}}>No candidates found. Add one to get started.</p>
          )}
        </>
      )}
    </>
  );
}
