import { Candidate as CandidateModel } from "@/models/candidate";
import { formatDate } from "@/utils/formatDate";
import { MdDelete } from "react-icons/md";

interface CandidateProps {
  candidate: CandidateModel;
  onCandidateClicked: (candidate: CandidateModel) => void;
  onDeleteCandidate: (candidate: CandidateModel) => void;
}

export default function Candidate({
  candidate,
  onDeleteCandidate,
  onCandidateClicked,
}: CandidateProps) {
  const { name, email, createdAt, updatedAt, status } = candidate;

  let createdUpdatedText: string;

  //* Pretty cheap operation here, so we can afford to optimize it later
  if (updatedAt > createdAt) {
    createdUpdatedText = "Updated: " + formatDate(updatedAt);
  } else {
    createdUpdatedText = "Created: " + formatDate(createdAt);
  }

  return (
    <tr onClick={() => onCandidateClicked(candidate)}>
      <td>{name}</td>
      <td>{email}</td>
      <td>{createdUpdatedText}</td>
      <td>{status}</td>
      <td>
        <MdDelete
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            onDeleteCandidate(candidate);
            e.stopPropagation();
          }}
          className="text-muted "
        />
      </td>
    </tr>
  );
}
