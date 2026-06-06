import { UpdateInfo } from "../services/updater";
import "../styles/update.css";

interface UpdateToastProps {
    updateInfo: UpdateInfo;
    onClose: () => void;
    onViewUpdate: () => void;
}

export default function UpdateToast({ updateInfo, onClose, onViewUpdate }: UpdateToastProps) {
    return (
        <div className="update-toast" onClick={onViewUpdate}>
            <div className="update-toast-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
            </div>
            <div className="update-toast-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="update-toast-title">Update Available</span>
                    <button className="update-toast-close" onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}>&times;</button>
                </div>
                <p className="update-toast-desc">Version {updateInfo.version} is ready.</p>
                <div className="update-toast-actions">
                    <button className="update-toast-btn update-toast-btn-primary" onClick={(e) => {
                        e.stopPropagation();
                        onViewUpdate();
                    }}>Update</button>
                    <button className="update-toast-btn update-toast-btn-secondary" onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}>Later</button>
                </div>
            </div>
        </div>
    );
}
