import SubmitForm from "@/components/Submit/SubmitForm";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Submit your ROM hack</h1>
      <p className="mt-2 text-[15px] text-foreground/80">Share your hack so others can discover and play it.</p>
      <div className="mt-8">
        <SubmitForm />
      </div>
    </div>
  );
}



