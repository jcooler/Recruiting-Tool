import Candidate from "./candidate";
import { Table } from "react-bootstrap";

export default function CandidateTable({ candidates }) {
  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Updated</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((candidate) => (
          <Candidate key={candidate.id} candidate={candidate} />
        ))}
      </tbody>
    </Table>
  );
}
