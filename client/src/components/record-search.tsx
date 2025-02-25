
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const categories = [
  "All",
  "General",
  "Prescription",
  "Lab Results",
  "Imaging",
  "Surgery",
  "Vaccination",
  "Chronic Condition",
  "Emergency",
];

export function RecordSearch({ onSearch }: { onSearch: (params: any) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const handleSearch = () => {
    onSearch({
      search: search || undefined,
      category: category === "All" ? undefined : category,
    });
  };

  return (
    <div className="flex gap-4 mb-6">
      <Input
        placeholder="Search records..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleSearch}>Search</Button>
    </div>
  );
}
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "./ui/button";

interface RecordSearchProps {
  onSearch: (params: Record<string, string>) => void;
}

export function RecordSearch({ onSearch }: RecordSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ search: searchTerm });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
      <Input 
        placeholder="Search records..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
