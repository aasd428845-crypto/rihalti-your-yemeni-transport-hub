import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  label?: string;
  fallback?: string;
}

const BackButton = ({ label = "رجوع", fallback = "/" }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="gap-1 text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowRight className="w-4 h-4" />
      {label}
    </Button>
  );
};

export default BackButton;
