import { useMediaQuery } from "@mui/material";

export default function useIsDesktop() {
    return useMediaQuery("(min-width: 971px)");
}
