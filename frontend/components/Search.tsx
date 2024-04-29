import { useState } from 'react';
import { Form } from 'react-bootstrap';
 
interface SearchBarProps {
  onSearch: (searchQuery: string) => void;
}

export default function Search({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    onSearch(event.target.value);
  };

  return (
    <div className="justify-content-center mb-3">
      <Form.Control
        type="text"
        placeholder="Search candidates"
        value={searchQuery}
        onChange={handleSearch}
        style={{ maxWidth: '300px' }}
      />
    </div>
  );
}
