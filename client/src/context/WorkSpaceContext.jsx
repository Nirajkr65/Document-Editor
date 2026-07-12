import React, { createContext, useState, useContext } from 'react';

const WorkSpaceContext = createContext();

export const WorkSpaceProvider = ({ children }) => {
  const [currentDocument, setCurrentDocument] = useState(null);

  return (
    <WorkSpaceContext.Provider value={{ currentDocument, setCurrentDocument }}>
      {children}
    </WorkSpaceContext.Provider>
  );
};

export const useWorkSpace = () => useContext(WorkSpaceContext);
