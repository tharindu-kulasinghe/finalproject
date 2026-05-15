import StampRequestListPage from '../../shared/StampRequest/StampRequestListPage';

const AdminStampRequests = () => {
  return (
    <StampRequestListPage
      basePath="/admin/stamp-requests"
      title="Stamp Requests"
      description="View all requests, manufacturer links, and admin/officer verification history." />);


};

export default AdminStampRequests;