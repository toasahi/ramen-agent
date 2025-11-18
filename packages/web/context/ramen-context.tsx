import { useUser } from "@/hooks/use-user";
import { createContext, ReactNode, useContext } from "react";


type UserDataContextType = ReturnType<typeof useUser>;

type RamenContextType = {
    userData: UserDataContextType
}

const ramenContext = createContext<RamenContextType | undefined>(undefined);

export const RamenContext = ({ children }: { children: ReactNode }) => {

    const userId = useUser();
    const contextValue:RamenContextType = {
        userData: userId
    };

    return (
        <ramenContext.Provider value={contextValue}>
           {children}
        </ramenContext.Provider>
    );
}

export const useRamenContext = () => {
  const context = useContext(ramenContext);
  if (!context) {
    throw new Error("useRamenContext must be used within a RamenProvider");
  }
  return context;
};