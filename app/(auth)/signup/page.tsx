
import { GalleryVerticalEnd } from "lucide-react"
import { SignupForm } from "./components/SignupForm"
export default function SignupPage() {



  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:hidden">
        <a href="#" className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Acme Inc.
        </a>
      </div>

      <SignupForm />

    </div>
  )
}
