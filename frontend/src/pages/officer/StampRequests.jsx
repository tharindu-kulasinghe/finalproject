import StampRequestListPage from '../shared/StampRequest/StampRequestListPage';

const OfficerStampRequests = () => {
  return (
    <StampRequestListPage
      basePath="/officer/stamp-requests"
      title="Stamp Requests"
      description="View all requests, manufacturer links, and officer/admin verification history." />);


};

export default OfficerStampRequests;