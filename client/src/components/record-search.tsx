import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import logger from "@/lib/logger";
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

interface RecordSearchProps {
  onSearch: (params: Record<string, string | undefined>) => void;
}

function RecordSearch({ onSearch }: RecordSearchProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    logger.info(`Performing search with terms: ${search}, category: ${category}`);

    const searchParams: Record<string, string | undefined> = {
      search: search.trim() || undefined,
      recordType: category === "All" ? undefined : category,
    };

    logger.debug(`Search params: ${JSON.stringify(searchParams)}`);
    onSearch(searchParams);
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-4 mb-6">
      <Input
        placeholder="Search records..."
        value={search}
        onChange={(e) => {
          logger.debug(`Search input changed: ${e.target.value}`);
          setSearch(e.target.value);
        }}
        className="max-w-xs"
      />
      <Select 
        value={category} 
        onValueChange={(value) => {
          logger.debug(`Category changed to: ${value}`);
          setCategory(value);
        }}
      >
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
      <Button type="submit">Search</Button>
    </form>
  );
}

export default RecordSearch;