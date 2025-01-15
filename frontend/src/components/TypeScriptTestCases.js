// Test cases for TypeScript type removal
const typeScriptPatterns = {
  reactFC: `
    const Component: React.FC = () => {};
    const GenericComponent: React.FC<Props> = () => {};
    const MultipleGenerics: React.FC<Props & State> = () => {};
  `,
  
  interfaceProps: `
    interface Props {
      name: string;
      age: number;
      onClick: () => void;
    }
    
    const Component = ({ name, age, onClick }: Props) => {};
  `,
  
  inlineTypes: `
    const Component = ({ 
      name,
      count,
      isActive,
      callback 
    }: { 
      name: string;
      count: number;
      isActive: boolean;
      callback: () => void;
    }) => {};
  `,
  
  complexJSX: `
    const Card: React.FC<CardProps> = ({ title, content }) => {
      return (
        <div className="card">
          <h2>{title}</h2>
          <div className="content">
            {content}
          </div>
        </div>
      );
    };
  `,
  
  typeAssertions: `
    const value = data as string;
    const element = <div>content</div> as JSX.Element;
    const handler = (e: React.MouseEvent<HTMLButtonElement>) => {};
  `,
  
  generics: `
    type ListProps<T> = {
      items: T[];
      renderItem: (item: T) => React.ReactNode;
    };
    
    const List<T extends unknown> = ({ items, renderItem }: ListProps<T>) => {};
  `,
  
  jsxStructure: `
    const Layout: React.FC<LayoutProps> = ({ children }) => {
      return (
        <div className="layout">
          <header className="header">
            <nav>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            {children}
          </main>
          <footer>
            <p>&copy; 2024</p>
          </footer>
        </div>
      );
    };
  `
};

// Expected outputs after type removal
const expectedOutputs = {
  reactFC: `
    const Component = () => {};
    const GenericComponent = () => {};
    const MultipleGenerics = () => {};
  `,
  
  interfaceProps: `
    const Component = ({ name, age, onClick }) => {};
  `,
  
  inlineTypes: `
    const Component = ({ 
      name,
      count,
      isActive,
      callback 
    }) => {};
  `,
  
  complexJSX: `
    const Card = ({ title, content }) => {
      return (
        <div className="card">
          <h2>{title}</h2>
          <div className="content">
            {content}
          </div>
        </div>
      );
    };
  `,
  
  typeAssertions: `
    const value = data;
    const element = <div>content</div>;
    const handler = (e) => {};
  `,
  
  generics: `
    const List = ({ items, renderItem }) => {};
  `,
  
  jsxStructure: `
    const Layout = ({ children }) => {
      return (
        <div className="layout">
          <header className="header">
            <nav>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            {children}
          </main>
          <footer>
            <p>&copy; 2024</p>
          </footer>
        </div>
      );
    };
  `
};

export { typeScriptPatterns, expectedOutputs }; 