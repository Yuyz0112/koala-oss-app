import { client } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { LoginForm } from "./components/login-form";
import NewsList from "./pages/NewsList";

function App() {
  const [authPassed, setAuthPassed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { error } = await client.auth.getUser();

      setAuthPassed(!error);
    };
    checkAuth();
  }, []);

  if (authPassed === null) {
    return <div>loading...</div>;
  }

  if (!authPassed) {
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <LoginForm className="w-[40%]" />
      </div>
    );
  }

  return <NewsList />;
}

export default App;
