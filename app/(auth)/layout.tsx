import { Card, CardContent } from "@/components/ui/card";


export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-lg ">
                {/* <SignupForm onSubmit={handleSignup} /> */}
               
                    <Card className=" overflow-hidden p-2 ">
                        <CardContent >
                                {children}
                        </CardContent>
                    </Card>
            </div>
        </div>
    )
}