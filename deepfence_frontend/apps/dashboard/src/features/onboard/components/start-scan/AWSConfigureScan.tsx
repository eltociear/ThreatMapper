import { IconContext } from 'react-icons';
import { HiPlusCircle } from 'react-icons/hi';
import { Button, Typography } from 'ui-components';

const scanType = [
  {
    name: 'CIS',
  },
  {
    name: 'GDPR',
  },
  {
    name: 'HIPPA',
  },
  {
    name: 'PIC',
  },
  {
    name: 'SOC2',
  },
  {
    name: 'NIST',
  },
];

export const AWSConfigureScan = () => {
  return (
    <>
      <div className="mt-8 flex gap-4">
        {scanType.map((scan) => (
          <Button color="primary" size="md" key={scan.name}>
            {scan.name}
            <IconContext.Provider
              value={{
                className: 'ml-2.5 w-5 h-5',
              }}
            >
              <HiPlusCircle />
            </IconContext.Provider>
          </Button>
        ))}
      </div>
      <p className={`${Typography.size.lg} ${Typography.weight.medium} mt-4`}>
        Please select at least one compliance type.
      </p>
    </>
  );
};
