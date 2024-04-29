import Candidate from "./candidate";
import { Container, Table, Button, Dropdown, DropdownButton, Row, Col } from "react-bootstrap";
import { Candidate as CandidateModel } from "../models/candidate";
import { useState } from "react";
import Search from "./Search"

interface CandidateTableProps {
  candidates: CandidateModel[];
  onDeleteCandidate: (candidate: CandidateModel) => void;
  onCandidateClicked: (candidate: CandidateModel) => void;
}

export default function CandidateTable({ candidates, onDeleteCandidate, onCandidateClicked }: CandidateTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Search feature
  const filteredCandidates = candidates.filter(candidate => candidate.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Pagination
  const totalCandidates = filteredCandidates.length;
  const totalPages = Math.ceil(totalCandidates / candidatesPerPage);

  // Change page
  const changePage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

 
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);

  return (
    <Container>
      <Search onSearch={(query: string) => setSearchQuery(query)} />
      <Table striped bordered hover responsive="sm">
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
          {currentCandidates.map((candidate) => (
            <Candidate key={candidate._id} candidate={candidate} onDeleteCandidate={onDeleteCandidate} onCandidateClicked={onCandidateClicked} />
          ))}
        </tbody>
      </Table>
      <Row className="justify-content-center align-items-center">
        <Col xs={4} className="text-center mt-2">
          <Button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
            Prev
          </Button>
        </Col>
        <Col xs={4} className="text-center mt-2">
          <DropdownButton id="pagination-dropdown" title={`Page ${currentPage}`}>
            {Array.from({ length: totalPages }, (_, i) => (
              <Dropdown.Item key={i + 1} onClick={() => changePage(i + 1)} active={i + 1 === currentPage}>
                Page {i + 1}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </Col>
        <Col xs={4} className="text-center mt-2">
          <Button onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>
            Next
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
