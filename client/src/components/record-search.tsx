
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
