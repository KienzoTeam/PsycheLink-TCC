import type { ReactNode } from 'react';
import { SelectionIndicator, Tab, TabList, TabPanel, Tabs as AbasAria, type TabsProps } from 'react-aria-components';
import css from './Tabs.module.css';

type Props = Omit<TabsProps, 'className' | 'style' | 'children'> & {
  abas: ReadonlyArray<{ id: string; rotulo: string; painel: ReactNode }>;
};

export function Tabs({ abas, ...resto }: Props) {
  return (
    <AbasAria {...resto} className={css.abas}>
      <TabList className={css.lista}>
        {abas.map((aba) => (
          <Tab key={aba.id} id={aba.id} className={css.aba}>
            {aba.rotulo}
            <SelectionIndicator className={css.indicador} />
          </Tab>
        ))}
      </TabList>
      {abas.map((aba) => (
        <TabPanel key={aba.id} id={aba.id} className={css.painel}>
          {aba.painel}
        </TabPanel>
      ))}
    </AbasAria>
  );
}
