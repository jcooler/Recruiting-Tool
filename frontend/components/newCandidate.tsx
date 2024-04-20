import { useState } from "react";
import { Modal, Button, Form, Row, Col} from "react-bootstrap";
import styles from "@/styles/newCandidate.module.css";
import { useForm } from "react-hook-form";
import { CandidateInput } from "@/network/candidate-api";
import * as candidateApi from "@/network/candidate-api";


interface NewCandidateProps {
onDismiss: () => void;
onCandidateAdded: (candidate: Candidate) => void;

}

const NewCandidate = ({onDismiss, onCandidateAdded}: NewCandidateProps) => {
  
  const { register, handleSubmit, formState: {errors, isSubmitting} } = useForm<CandidateInput>();

  async function onSubmit(input: CandidateInput) {
try {
  const formResponse = await candidateApi.createCandidate(input);
  onCandidateAdded(formResponse);
} catch (error) {
  console.log(error);
  alert(error);
}
  }

  return (
    <>
      <Modal show onHide={onDismiss}>
        <Modal.Header closeButton>
          <Modal.Title>Add Candidate</Modal.Title>
          
        </Modal.Header>
        <Modal.Body>
          <Form id="addCandidateForm" onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col>
            <Form.Group >
              <Form.Label>Name</Form.Label>
              <Form.Control
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
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
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
              <Form.Label>Status</Form.Label>
              <Form.Control
                type="text"
                {...register("status")}
              />
            </Form.Group>
</Col>
<Col>
            <Form.Group >
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                {...register("phone")}
                
              />
            </Form.Group>
</Col>
            </Row>
            <Form.Group >
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                name="address"
                
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Skills</Form.Label>
              <Form.Control
                type="text"
                {...register("skills")}
              
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Experience</Form.Label>
              <Form.Control
                type="number"
                name="experience"
             
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Education</Form.Label>
              <Form.Control
                type="text"
                {...register("education")}
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Certifications</Form.Label>
              <Form.Control
                type="text"
                {...register("certifications")}
              
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Desired Pay</Form.Label>
              <Form.Control
                type="text"
                {...register("desiredPay")}
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Type of Employment</Form.Label>
              <Form.Control
                type="text"
                {...register("typeOfEmployment")}
              />
            </Form.Group>

            <Form.Group >
              <Form.Label>Desired Work Location</Form.Label>
              <Form.Control
                type="text"
                {...register("desiredWorkLocation")}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" 
          type="submit"
          form="addCandidateForm"
          disabled={isSubmitting}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NewCandidate;
