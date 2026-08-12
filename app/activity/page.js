// app/activity/page.js
import ActivityLogPage from '../../components/ActivityLogPage';

export const metadata = {
    title: 'Activity Stream | ENGAGE',
    description: 'Real-time platform activity log.',
};

export default function ActivityPage() {
    return <ActivityLogPage />;
}