import { serve } from "h3";
import H3 from "taskwish-h3"
import { app } from "./app"

serve(H3(app), { port: 3000 });