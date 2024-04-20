import Candidate from "./candidate";
import { Table } from "react-bootstrap";
import { Container } from "react-bootstrap";

export default function CandidateTable({ candidates }) {
  return (
    <Container>
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Created</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <Candidate key={candidate._id} candidate={candidate} />
        ))}
      </tbody>
    </Table>
    </Container>
  );
}
