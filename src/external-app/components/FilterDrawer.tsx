import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "./ui/sheet";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
// Select replaced with native <select>
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { SlidersHorizontal, X, ArrowUpDown, Filter as FilterIcon } from "lucide-react";
import { Filters, StepItem } from "../types/dance";
import { getUniqueValues } from "../data/mockData";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  steps: StepItem[];
}

export function FilterDrawer({ open, onOpenChange, filters, onFiltersChange, steps }: FilterDrawerProps) {
  const { classes, dances, styles } = getUniqueValues(steps);

  const handleClassToggle = (className: string) => {
    const newClasses = filters.classes.includes(className)
      ? filters.classes.filter(c => c !== className)
      : [...filters.classes, className];
    
    onFiltersChange({ ...filters, classes: newClasses });
  };

  const handleDanceToggle = (dance: string) => {
    const newDances = filters.dances.includes(dance)
      ? filters.dances.filter(d => d !== dance)
      : [...filters.dances, dance];
    
    onFiltersChange({ ...filters, dances: newDances });
  };

  const handleStyleToggle = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter(s => s !== style)
      : [...filters.styles, style];
    
    onFiltersChange({ ...filters, styles: newStyles });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      classes: [],
      dances: [],
      styles: [],
      sort: filters.sort
    });
  };

  const selectAllDances = () => {
    onFiltersChange({ ...filters, dances });
  };
  const clearDances = () => {
    onFiltersChange({ ...filters, dances: [] });
  };
  const selectAllStyles = () => {
    onFiltersChange({ ...filters, styles });
  };
  const clearStyles = () => {
    onFiltersChange({ ...filters, styles: [] });
  };
  const selectAllClasses = () => {
    onFiltersChange({ ...filters, classes });
  };
  const clearClasses = () => {
    onFiltersChange({ ...filters, classes: [] });
  };

  const totalActiveFilters = filters.classes.length + filters.dances.length + filters.styles.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dr-filter-sheet" aria-describedby="dr-filter-desc">
        {/* Hidden description for a11y (outside to avoid nesting issues) */}
        <SheetDescription id="dr-filter-desc">
          <span style={{position:"absolute",width:1,height:1,margin:-1,clip:"rect(0 0 0 0)",overflow:"hidden"}}>
            Filter and sort the dance steps by class, dance type, and style.
          </span>
        </SheetDescription>
        <div className="flex flex-col h-full">
          {/* Header - aligned like Edit Step modal */}
          <div className="dr-filter-header">
            <div className="dr-form-header">
              <SheetTitle className="dr-form-title">Filters & Sort</SheetTitle>
              <div className="dr-form-actions">
                {totalActiveFilters > 0 && (
                  <Button variant="ghost" onClick={clearAllFilters} className="dr-filter-clear">
                    <X className="dr-filter-clear-icon" />
                    Clear All
                  </Button>
                )}
                <SheetClose aria-label="Close" className="dr-close-btn">
                  <X className="w-4 h-4" />
                </SheetClose>
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {totalActiveFilters > 0 && (
            <div className="dr-filter-badges">
              {filters.classes.map((className) => (
                <Badge key={`class-${className}`} variant="secondary" className="dr-filter-badge">
                  {className}
                </Badge>
              ))}
              {filters.dances.map((dance) => (
                <Badge key={`dance-${dance}`} variant="secondary" className="dr-filter-badge">
                  {dance}
                </Badge>
              ))}
              {filters.styles.map((style) => (
                <Badge key={`style-${style}`} variant="secondary" className="dr-filter-badge">
                  {style}
                </Badge>
              ))}
            </div>
          )}

          {/* Scrollable Content */}
          <ScrollArea className="dr-filter-scroll">
            <div className="space-y-6 pr-4">
              {/* Sort Section */}
              <div className="p-4 rounded-2xl bg-card border">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpDown className="w-4 h-4 text-primary" />
                  <h3>Sort By</h3>
                </div>
                <select
                  className="border rounded-md h-9 px-3 w-full bg-background"
                  value={filters.sort}
                  onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value as Filters["sort"] })}
                >
                  <option value="az">A-Z</option>
                  <option value="recent">Recently Added</option>
                  <option value="mostPlayed">Most Played</option>
                </select>
              </div>

              {/* Classes Section */}
              {classes.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border">
                  <div className="dr-filter-section-head">
                    <h3 className="dr-filter-title-strong">Classes</h3>
                    <div className="dr-filter-head-right">
                      <Badge variant="outline" className="dr-filter-count">
                        {filters.classes.length}/{classes.length}
                      </Badge>
                      <div className="dr-filter-tools-inline">
                        <Button variant="outline" size="sm" onClick={selectAllClasses}>Select all</Button>
                        <Button variant="ghost" size="sm" onClick={clearClasses}>Clear</Button>
                      </div>
                    </div>
                  </div>
                  <div className="dr-chip-grid" aria-label="Classes">
                    {classes.map((className: string) => {
                      const selected = filters.classes.includes(className);
                      return (
                        <button
                          key={className}
                          type="button"
                          className={`dr-chip${selected ? " selected" : ""}`}
                          onClick={() => handleClassToggle(className)}
                          aria-pressed={selected}
                        >
                          {className}
                        </button>
                      );
                    })}
                  </div>
                  <div className="dr-filter-sep" />
                </div>
              )}

              {/* Dances Section */}
              {dances.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border">
                  <div className="dr-filter-section-head">
                    <h3 className="dr-filter-title-strong">Dance Types</h3>
                    <div className="dr-filter-head-right">
                      <Badge variant="outline" className="dr-filter-count">
                        {filters.dances.length}/{dances.length}
                      </Badge>
                      <div className="dr-filter-tools-inline">
                        <Button variant="outline" size="sm" onClick={selectAllDances}>Select all</Button>
                        <Button variant="ghost" size="sm" onClick={clearDances}>Clear</Button>
                      </div>
                    </div>
                  </div>
                  <div className="dr-chip-grid" aria-label="Dances">
                    {dances.map((dance: string) => {
                      const selected = filters.dances.includes(dance);
                      return (
                        <button
                          key={dance}
                          type="button"
                          className={`dr-chip${selected ? " selected" : ""}`}
                          onClick={() => handleDanceToggle(dance)}
                          aria-pressed={selected}
                        >
                          {dance}
                        </button>
                      );
                    })}
                  </div>
                  <div className="dr-filter-sep" />
                </div>
              )}

              {/* Styles Section */}
              {styles.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border">
                  <div className="dr-filter-section-head">
                    <h3 className="dr-filter-title-strong">Styles</h3>
                    <div className="dr-filter-head-right">
                      <Badge variant="outline" className="dr-filter-count">
                        {filters.styles.length}/{styles.length}
                      </Badge>
                      <div className="dr-filter-tools-inline">
                        <Button variant="outline" size="sm" onClick={selectAllStyles}>Select all</Button>
                        <Button variant="ghost" size="sm" onClick={clearStyles}>Clear</Button>
                      </div>
                    </div>
                  </div>
                  <div className="dr-chip-grid" aria-label="Styles">
                    {styles.map((style: string) => {
                      const selected = filters.styles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          className={`dr-chip${selected ? " selected" : ""}`}
                          onClick={() => handleStyleToggle(style)}
                          aria-pressed={selected}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                  <div className="dr-filter-sep" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
