import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl ">
                {/* <SignupForm onSubmit={handleSignup} /> */}
                <div className={cn("flex flex-col gap-6 ")} >
                    <Card className=" overflow-hidden p-0 ">
                        <CardContent className="grid p-0 md:grid-cols-2">

                            <div >
                                {children}
                            </div>
                            <div className="relative hidden bg-muted lg:block">
                                <img
                                    src="/placeholder.svg"
                                    alt="Image"
                                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                                />
                            </div>



                        </CardContent>
                    </Card>

                    <FieldDescription className="px-6 text-center">
                        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
                        and <a href="#">Privacy Policy</a>.
                    </FieldDescription>
                </div>
            </div>
        </div>
    )
}