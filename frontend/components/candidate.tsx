import { Candidate as CandidateModel} from "@/pages/models/candidate";
import styles from "@styles/candidate.module.css";


interface CandidateProps {
candidate: CandidateModel;
}



export default function Candidate({candidate}: CandidateProps) {



  return (
    

  <tr>
    <td>{candidate.name}</td>
    <td>{candidate.email}</td>
    <td>{candidate.updatedAt}</td>
    <td>{candidate.status}</td>
  </tr>

  );
}