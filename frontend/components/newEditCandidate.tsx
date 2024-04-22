import { useState } from "react";
import { Modal, Button, Form, Row, Col} from "react-bootstrap";
import styles from "@/styles/newCandidate.module.css";
import { useForm } from "react-hook-form";
import { CandidateInput } from "@/network/candidate-api";
import * as candidateApi from "@/network/candidate-api";


interface NewEditCandidateProps {
 candidateToEdit?: Candidate, 
onDismiss: () => void;
onCandidateAdded: (candidate: Candidate) => void;

}

const NewEditCandidate = ({candidateToEdit, onDismiss, onCandidateAdded}: NewEditCandidateProps) => {
  
  const { register, handleSubmit, formState: {errors, isSubmitting} } = useForm<CandidateInput>({
defaultValues: {
  name: candidateToEdit?.name || "",
  email: candidateToEdit?.email || "",
  status: candidateToEdit?.status || "",
  phone: candidateToEdit?.phone || "",
  address: candidateToEdit?.address || "",
  skills: candidateToEdit?.skills  || [],
  experience: candidateToEdit?.experience || 0,
  education: candidateToEdit?.education || "",
  certifications: candidateToEdit?.certifications || [],
  desiredPay: candidateToEdit?.desiredPay || "",
  typeOfEmployment: candidateToEdit?.typeOfEmployment || [],
  desiredWorkLocation: candidateToEdit?.desiredWorkLocation || [],
  notes: candidateToEdit?.notes || "",
}

  });

  async function onSubmit(input: CandidateInput) {
try {

  let candidateResponse: Candidate;
  if (candidateToEdit) {
    candidateResponse = await candidateApi.updateCandidate(candidateToEdit._id, input);
  } else {
    candidateResponse = await candidateApi.createCandidate(input);
  }
  onCandidateAdded(candidateResponse);
  
} catch (error) {
  console.log(error);
  alert(error);
}
  }

  return (
    <>
      <Modal size="xl" show onHide={onDismiss}>
        <Modal.Header closeButton>
          <Modal.Title>{candidateToEdit ? "Edit Candidate" : "Add Candidate"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="addEditCandidateForm" onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col>
            <Form.Group >
              <Form.Label htmlFor="name">Name <span style={{ color: "#b50c00" }}>*</span></Form.Label>
              <Form.Control
              id="name"
                type="text"
                isInvalid={!!errors.name}
                {...register("name", {required: "Name is required"})}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name?.message}
              </Form.Control.Feedback>
            </Form.Group>
            </Col>
            <Col>
            <Form.Group >
              <Form.Label htmlFor="email">Email <span style={{ color: "#b50c00" }}>*</span></Form.Label>
              <Form.Control
              id="email"
                type="email"
                isInvalid={!!errors.email}
                {...register("email", {required: "Email is required"})}
              />
              <Form.Control.Feedback type="invalid">
                {errors.email?.message}
              </Form.Control.Feedback>
            </Form.Group>
            </Col>
            </Row>
<Row>
<Col>
            <Form.Group >
              <Form.Label htmlFor="phone">Phone</Form.Label>
              <Form.Control
                id="phone"
                type="text"
                {...register("phone")}
                
              />
            </Form.Group>
</Col>
  <Col>
            <Form.Group >
              <Form.Label htmlFor="status">Status</Form.Label>
              <Form.Control
                id="status"
                type="text"
                {...register("status")}
              />
            </Form.Group>
</Col>
            </Row>
            <Form.Group>
              <Form.Label htmlFor="address">Address</Form.Label>
              <Form.Control
                id="address"
                type="text"
                {...register("address")}
                
              />
            </Form.Group>
<Row>
  <Col> 

  <Form.Group>
              <Form.Label htmlFor="education">Education</Form.Label>
              <Form.Control
                id="education"
                type="text"
                {...register("education")}
              />
            </Form.Group>
</Col>
<Col>
            <Form.Group >
              <Form.Label htmlFor="experience">Experience</Form.Label>
              <Form.Control
                id="experience"
                type="number"
                {...register("experience")}
             
              />
            </Form.Group>
</Col>
<Col>
<Form.Group >
              <Form.Label htmlFor="desiredPay">Desired Pay</Form.Label>
              <Form.Control
                id="desiredPay"
                type="text"
                {...register("desiredPay")}
              />
            </Form.Group>
</Col>
            </Row>
            <Form.Group >
              <Form.Label htmlFor="skills">
              <span style={{ fontSize: "inherit", color: "inherit" }}>Skills</span>
            <span style={{ fontSize: "0.8em", color: "#666" }}> (HTML, Java, etc)</span>
              </Form.Label>
              <Form.Control
                id="skills"
                type="text"
                {...register("skills")}
              
              />
            </Form.Group>

            <Form.Group >
              <Form.Label htmlFor="certifications">Certifications <span style={{ fontSize: "0.8em", color: "#666" }}> (CISSP, AWS, etc.)</span></Form.Label>
              <Form.Control
                id="certifications"
                type="text"
                {...register("certifications")}
              
              />
            </Form.Group>
            <Row>
  <Col> 
            <Form.Group >
              <Form.Label htmlFor="typeOfEmployment">Type of Employment <span style={{ fontSize: "0.8em", color: "#666" }}> (FT, PT, C2C, etc)</span></Form.Label>
              <Form.Control
                id="typeOfEmployment"
                type="text"
                {...register("typeOfEmployment")}
              />
            </Form.Group>
            </Col>
<Col>
            <Form.Group >
              <Form.Label htmlFor="desiredWorkLocation">Desired Work Location <span style={{ fontSize: "0.8em", color: "#666" }}> (office, remote, etc)</span></Form.Label>
              <Form.Control
                id="desiredWorkLocation"
                type="text"
                {...register("desiredWorkLocation")}
              />
            </Form.Group>
            
  </Col> 
  </Row>
            <Form.Group >
              <Form.Label htmlFor="notes">Notes</Form.Label>
              <Form.Control
                id="notes"
                as="textarea"
                rows={5}
                {...register("notes")}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
        <span style={{ color: "#b50c00", marginRight: "15px" }}>* Required</span>
          <Button variant="primary" 
          type="submit"
          form="addEditCandidateForm"
          disabled={isSubmitting}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NewEditCandidate;
