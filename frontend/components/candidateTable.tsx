import Candidate from "./candidate";
import { Table } from "react-bootstrap";
import { Container } from "react-bootstrap";

export default function CandidateTable({ candidates, onDeleteCandidate, onCandidateClicked }) {
  return (
    <Container>
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Created</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <Candidate key={candidate._id} candidate={candidate} onDeleteCandidate={onDeleteCandidate} onCandidateClicked={onCandidateClicked}/>
        ))}
      </tbody>
    </Table>
    </Container>
  );
}
