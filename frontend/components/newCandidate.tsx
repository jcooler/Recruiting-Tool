import { useState } from "react";
import { Modal, Button, Form, Row, Col} from "react-bootstrap";
import styles from "@/styles/newCandidate.module.css";

const NewCandidate = ({ onAddCandidate }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "",
    phone: "",
    address: "",
    skills: "",
    experience: "",
    education: "",
    certifications: "",
    desiredPay: "",
    typeOfEmployment: "",
    desiredWorkLocation: "",
  });

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = () => {
    // Add validation if needed
    onAddCandidate(formData);
    setFormData({
      name: "",
      email: "",
      status: "",
      phone: "",
      address: "",
      skills: "",
      experience: "",
      education: "",
      certifications: "",
      desiredPay: "",
      typeOfEmployment: "",
      desiredWorkLocation: "",
    });
    handleClose();
  };

  return (
    <>
      <Button variant="primary" onClick={handleShow}>
        Add Candidate
      </Button>

      <Modal show={showModal} onHide={handleClose} dialogClassName={styles.modal}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col>
            <Form.Group controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>
            </Col>
            <Col>
            <Form.Group controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>
            </Col>
            </Row>

            <Form.Group controlId="status">
              <Form.Label>Status</Form.Label>
              <Form.Control
                type="text"
                name="status"
                value={formData.status}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="address">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="skills">
              <Form.Label>Skills</Form.Label>
              <Form.Control
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="experience">
              <Form.Label>Experience</Form.Label>
              <Form.Control
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="education">
              <Form.Label>Education</Form.Label>
              <Form.Control
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="certifications">
              <Form.Label>Certifications</Form.Label>
              <Form.Control
                type="text"
                name="certifications"
                value={formData.certifications}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="desiredPay">
              <Form.Label>Desired Pay</Form.Label>
              <Form.Control
                type="text"
                name="desiredPay"
                value={formData.desiredPay}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="typeOfEmployment">
              <Form.Label>Type of Employment</Form.Label>
              <Form.Control
                type="text"
                name="typeOfEmployment"
                value={formData.typeOfEmployment}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group controlId="desiredWorkLocation">
              <Form.Label>Desired Work Location</Form.Label>
              <Form.Control
                type="text"
                name="desiredWorkLocation"
                value={formData.desiredWorkLocation}
                onChange={handleChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Add
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NewCandidate;
