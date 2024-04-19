import { Candidate as CandidateModel} from "@/pages/models/candidate";
import { formatDate } from "@/utils/formatDate";
import styles from "@styles/candidate.module.css";


interface CandidateProps {
candidate: CandidateModel;
}



export default function Candidate({candidate}: CandidateProps) {

  const {
    name,
    email,
    createdAt,
    updatedAt,
    status,
  } = candidate;
  

let createdUpdatedText: string;

//* Pretty cheap operation here, so I don't mind the lack of memoization. If things get more complex, I'd add useEffect or useMemo.
if (updatedAt > createdAt) {
  createdUpdatedText = "Updated: " + formatDate(updatedAt);
} else {
  createdUpdatedText = "Created: " + formatDate(createdAt);
}

  return (
    

  <tr>
    <td>{candidate.name}</td>
    <td>{candidate.email}</td>
    <td>{createdAt}</td>
    <td>{candidate.status}</td>
  </tr>

  );
}